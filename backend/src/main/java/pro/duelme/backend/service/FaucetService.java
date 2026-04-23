package pro.duelme.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.utils.Convert;
import pro.duelme.backend.config.FaucetProperties;
import pro.duelme.backend.dto.FaucetClaimResponse;
import pro.duelme.backend.exception.FaucetAlreadyClaimedException;
import pro.duelme.backend.exception.FaucetDisabledException;
import pro.duelme.backend.exception.FaucetExecutionException;
import pro.duelme.backend.model.FaucetClaim;
import pro.duelme.backend.repository.FaucetClaimRepository;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Dev-only testnet faucet. Sends a small ETH drop to cover gas and mints
 * MockUSDT in one atomic HTTP request. One claim per wallet, ever.
 *
 * <p>The bean is ALWAYS wired. On-off is gated by the runtime
 * {@code duelme.faucet.enabled} flag checked inside {@link #claim}. We do not
 * use {@code @ConditionalOnProperty} here because Spring Boot's AOT evaluates
 * it at build time; in a GraalVM native image this would strip the bean
 * regardless of the runtime environment variable.
 */
@Service
public class FaucetService {

    private static final Logger log = LoggerFactory.getLogger(FaucetService.class);
    private static final Pattern ADDRESS_PATTERN = Pattern.compile("^0x[0-9a-fA-F]{40}$");
    private static final BigInteger ETH_GAS_LIMIT = BigInteger.valueOf(100_000L);
    private static final BigInteger MINT_GAS_LIMIT = BigInteger.valueOf(200_000L);

    // Sanity caps — prevent a misconfigured env var from draining the hot wallet.
    private static final BigDecimal MAX_ETH_PER_CLAIM = new BigDecimal("0.01");
    private static final BigInteger MAX_USDT_RAW_PER_CLAIM = BigInteger.valueOf(10_000_000_000L); // 10 000 USDT (6 decimals)

    private final FaucetProperties props;
    private final FaucetClaimRepository repository;
    // Web3j + signer are only initialised when enabled. Disabled instances keep
    // these null and short-circuit in claim() with FaucetDisabledException.
    private final Web3j web3j;
    private final Credentials credentials;
    private final TransactionManager txManager;

    public FaucetService(FaucetProperties props, FaucetClaimRepository repository) {
        this.props = props;
        this.repository = repository;
        if (!props.enabled()) {
            this.web3j = null;
            this.credentials = null;
            this.txManager = null;
            log.info("Faucet disabled (duelme.faucet.enabled=false)");
            return;
        }
        if (props.privateKey() == null || props.privateKey().isBlank()) {
            throw new IllegalStateException(
                "duelme.faucet.enabled=true but duelme.faucet.private-key is not set");
        }
        if (props.rpcUrl() == null || props.rpcUrl().isBlank()) {
            throw new IllegalStateException(
                "duelme.faucet.enabled=true but duelme.faucet.rpc-url is not set");
        }
        if (props.mockUsdtAddress() == null || !ADDRESS_PATTERN.matcher(props.mockUsdtAddress()).matches()) {
            throw new IllegalStateException(
                "duelme.faucet.mock-usdt-address is missing or malformed");
        }
        if (props.chainId() <= 0) {
            throw new IllegalStateException("duelme.faucet.chain-id must be positive");
        }
        if (props.ethAmountEth() == null || props.ethAmountEth().signum() <= 0
            || props.ethAmountEth().compareTo(MAX_ETH_PER_CLAIM) > 0) {
            throw new IllegalStateException(
                "duelme.faucet.eth-amount-eth must be >0 and <=" + MAX_ETH_PER_CLAIM);
        }
        if (props.usdtAmountRaw() == null || props.usdtAmountRaw().signum() <= 0
            || props.usdtAmountRaw().compareTo(MAX_USDT_RAW_PER_CLAIM) > 0) {
            throw new IllegalStateException(
                "duelme.faucet.usdt-amount-raw must be >0 and <=" + MAX_USDT_RAW_PER_CLAIM);
        }
        this.web3j = Web3j.build(new HttpService(props.rpcUrl()));
        this.credentials = Credentials.create(normalizeKey(props.privateKey()));
        this.txManager = new RawTransactionManager(web3j, credentials, props.chainId());
        log.info(
            "Faucet enabled on chain {}: signer={}, mockUsdt={}, ethPerClaim={}, usdtPerClaim={}",
            props.chainId(),
            credentials.getAddress(),
            props.mockUsdtAddress(),
            props.ethAmountEth(),
            props.usdtAmountRaw()
        );
    }

    public synchronized FaucetClaimResponse claim(String walletAddress) {
        if (!props.enabled()) {
            throw new FaucetDisabledException();
        }
        if (walletAddress == null || !ADDRESS_PATTERN.matcher(walletAddress).matches()) {
            throw new FaucetExecutionException("Invalid wallet address", null);
        }
        String normalized = walletAddress.toLowerCase();

        FaucetClaim lock;
        Optional<FaucetClaim> existing = repository.findByWalletAddress(normalized);
        if (existing.isPresent()) {
            lock = existing.get();
            if (lock.usdtTxHash() != null) {
                throw new FaucetAlreadyClaimedException(normalized);
            }
            // Otherwise resume: lock.ethTxHash() may hold a prior (landed)
            // ETH tx — preserved below so we don't double-drain the faucet
            // wallet when the previous USDT mint failed mid-flow.
        } else {
            // Insert-first lock. If the save races another claim in a future
            // multi-node setup, the Mongo unique index on `walletAddress`
            // (created in MongoConfig#ensureFaucetClaimIndexes) raises
            // DuplicateKey here and we convert it to a 409.
            try {
                lock = repository.save(new FaucetClaim(null, normalized, null, null, null));
            } catch (DuplicateKeyException ex) {
                throw new FaucetAlreadyClaimedException(normalized);
            }
        }

        String ethTxHash = lock.ethTxHash();
        try {
            // Legacy tx on EIP-1559 chains (incl. Arbitrum Sepolia) uses
            // gasPrice as maxFeePerGas. The same value is reused for the
            // paired ETH + USDT submissions, so if the base fee ticks up
            // between them the second tx rejects with "max fee per gas less
            // than block base fee". Doubling the suggested price gives ample
            // headroom; the miner tip is still bounded by the actual base
            // fee so the only cost is a brief over-reservation.
            BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice().multiply(BigInteger.TWO);

            if (ethTxHash == null) {
                BigInteger ethValue = Convert.toWei(props.ethAmountEth(), Convert.Unit.ETHER).toBigInteger();
                ethTxHash = sendRaw(gasPrice, ETH_GAS_LIMIT, normalized, "", ethValue, "ETH transfer");
            }
            String usdtTxHash = sendRaw(
                gasPrice,
                MINT_GAS_LIMIT,
                props.mockUsdtAddress(),
                encodeMint(normalized),
                BigInteger.ZERO,
                "USDT mint"
            );

            FaucetClaim finished = new FaucetClaim(
                lock.id(), normalized, ethTxHash, usdtTxHash, lock.createdAt());
            return toResponse(repository.save(finished));
        } catch (Exception ex) {
            if (ethTxHash == null) {
                // Nothing on-chain yet — release the lock so the user can
                // retry after the transient issue.
                repository.deleteById(lock.id());
                log.error("Faucet pre-submission failure for {} (lock {} released)",
                    normalized, lock.id(), ex);
            } else {
                // ETH is on-chain but USDT mint failed. Persist the new ETH
                // hash so a retry resumes from the mint step; on repeat
                // resume failures the lock already carries the hash, skip
                // the no-op write.
                if (lock.ethTxHash() == null) {
                    repository.save(new FaucetClaim(
                        lock.id(), normalized, ethTxHash, null, lock.createdAt()));
                }
                log.error("Faucet USDT mint failed after ETH tx {} for {} (lock {} kept)",
                    ethTxHash, normalized, lock.id(), ex);
            }
            if (ex instanceof FaucetExecutionException fee) throw fee;
            throw new FaucetExecutionException("Faucet execution failed", ex);
        }
    }

    private String sendRaw(
        BigInteger gasPrice,
        BigInteger gasLimit,
        String to,
        String data,
        BigInteger value,
        String label
    ) throws Exception {
        EthSendTransaction res = txManager.sendTransaction(gasPrice, gasLimit, to, data, value);
        if (res.hasError()) {
            log.error("{} RPC error: code={} message={}",
                label, res.getError().getCode(), res.getError().getMessage());
            throw new FaucetExecutionException(label + " failed on RPC", null);
        }
        String hash = res.getTransactionHash();
        if (hash == null) {
            throw new FaucetExecutionException(label + " returned no tx hash", null);
        }
        return hash;
    }

    private String encodeMint(String recipient) {
        Function fn = new Function(
            "mint",
            List.of(new Address(recipient), new Uint256(props.usdtAmountRaw())),
            Collections.emptyList()
        );
        return FunctionEncoder.encode(fn);
    }

    private static String normalizeKey(String key) {
        return key.startsWith("0x") ? key.substring(2) : key;
    }

    private static FaucetClaimResponse toResponse(FaucetClaim claim) {
        return new FaucetClaimResponse(
            claim.walletAddress(),
            claim.ethTxHash(),
            claim.usdtTxHash(),
            claim.createdAt()
        );
    }
}

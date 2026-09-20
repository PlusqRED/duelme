package pro.duelme.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import pro.duelme.backend.validation.EvmAddress;

import java.util.HashMap;
import java.util.Map;

/**
 * The DuelMe deployment that is live on each chain, keyed by chain id.
 *
 * <p>Hand-mirrored from {@code contracts/broadcast/*&#47;run-latest.json}, the
 * same way {@code frontend/src/lib/constants.ts} mirrors it — CLAUDE.md's
 * "contract addresses have exactly one source" rule. {@code
 * deployedAddresses.test.ts} pins both copies to the artifact, so a redeploy
 * that forgets this file fails the frontend suite.
 *
 * <p>Read by {@code GameService}, which scopes a game's duel badge to the deployments
 * named here — that is what makes the badge reset by itself on a redeploy instead of
 * counting a retired contract's duels forever.
 *
 * <p>Every request-time lookup of a single duel takes the address from the caller
 * instead, because the client knows which deployment it is talking to and the backend
 * must keep serving rows for a deployment that is no longer current.
 */
@ConfigurationProperties(prefix = "duelme.contracts")
public record ContractProperties(Map<Integer, String> duelMe) {

    public ContractProperties {
        if (duelMe == null || duelMe.isEmpty()) {
            throw new IllegalStateException(
                "duelme.contracts.duel-me must name the live DuelMe address for each chain");
        }
        var normalized = new HashMap<Integer, String>(duelMe.size());
        duelMe.forEach((chainId, address) -> {
            if (!EvmAddress.isValid(address)) {
                // The usual cause is an unquoted 0x… in YAML: it parses as a hex
                // integer and Spring binds the decimal form, which no longer looks
                // like an address at all.
                throw new IllegalStateException(
                    "duelme.contracts.duel-me[" + chainId + "] is not an address: " + address
                        + " (quote it — a bare 0x… parses as a number)");
            }
            normalized.put(chainId, address.toLowerCase());
        });
        duelMe = Map.copyOf(normalized);
    }
}

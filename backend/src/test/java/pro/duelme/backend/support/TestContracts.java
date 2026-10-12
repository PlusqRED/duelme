package pro.duelme.backend.support;

/**
 * The world every duel-metadata suite asserts about: one chain carrying two
 * DuelMe deployments.
 *
 * <p>Re-declaring these per suite is how two suites end up testing different
 * worlds — the reason {@code contracts/test/helpers/DuelMeTestConstants.sol}
 * exists on the Solidity side. A new shared test constant goes here.
 */
public final class TestContracts {

    /** Stands in for the deployment a duel was created under. */
    public static final String CONTRACT = "0xaaaa111111111111111111111111111111111111";

    /** The same chain, redeployed — duel ids start over, so ids collide across the two. */
    public static final String REDEPLOYED_CONTRACT = "0xbbbb222222222222222222222222222222222222";

    /** Arbitrum Sepolia, the chain whose deployment {@code application-test.yml} replaces with {@link #CONTRACT}. */
    public static final int CHAIN_ID = 421614;

    /** Arbitrum One: it keeps the deployment {@code application.yml} names, which is neither address above. */
    public static final int OTHER_CHAIN_ID = 42161;

    private TestContracts() {
    }
}

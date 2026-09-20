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

    /** Arbitrum Sepolia, the one chain `application.yml` configures for tests. */
    public static final int CHAIN_ID = 421614;

    private TestContracts() {
    }
}

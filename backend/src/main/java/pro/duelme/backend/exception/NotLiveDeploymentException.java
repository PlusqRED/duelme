package pro.duelme.backend.exception;

public class NotLiveDeploymentException extends RuntimeException {

    public NotLiveDeploymentException(int chainId, String contractAddress) {
        super(contractAddress + " is not the live DuelMe deployment on chain " + chainId);
    }
}

package pro.duelme.backend.exception;

public class ProfileNotFoundException extends RuntimeException {

    public ProfileNotFoundException(String walletAddress) {
        super("Profile not found for wallet: " + walletAddress);
    }
}

package pro.duelme.backend.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;

import java.util.List;

public class WalletAuthenticationToken extends AbstractAuthenticationToken {

    private final String walletAddress;

    public WalletAuthenticationToken(String walletAddress) {
        super(List.of());
        this.walletAddress = walletAddress;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public Object getPrincipal() {
        return walletAddress;
    }

    public String getWalletAddress() {
        return walletAddress;
    }
}

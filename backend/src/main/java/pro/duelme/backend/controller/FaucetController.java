package pro.duelme.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pro.duelme.backend.dto.FaucetClaimResponse;
import pro.duelme.backend.exception.FaucetDisabledException;
import pro.duelme.backend.service.FaucetService;

import java.util.Optional;

@Tag(name = "Faucet", description = "Dev-only testnet faucet (ETH + MockUSDT)")
@RestController
@RequestMapping("/api/v1/faucet")
public class FaucetController {

    private final Optional<FaucetService> faucetService;

    public FaucetController(Optional<FaucetService> faucetService) {
        this.faucetService = faucetService;
    }

    @Operation(
        summary = "Send testnet ETH + MockUSDT to the caller (one per wallet)",
        security = @SecurityRequirement(name = "bearer")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Faucet executed, tx hashes returned"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
        @ApiResponse(responseCode = "409", description = "Wallet already claimed"),
        @ApiResponse(responseCode = "502", description = "On-chain transaction failed"),
        @ApiResponse(responseCode = "503", description = "Faucet disabled in this environment")
    })
    @PostMapping("/claim")
    public FaucetClaimResponse claim(
        @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress
    ) {
        return faucetService
            .orElseThrow(FaucetDisabledException::new)
            .claim(walletAddress);
    }
}

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
import pro.duelme.backend.service.FaucetService;

@Tag(name = "Faucet", description = "Dev-only testnet faucet (ETH + MockUSDT)")
@RestController
@RequestMapping("/api/v1/faucet")
public class FaucetController {

    private final FaucetService faucetService;

    public FaucetController(FaucetService faucetService) {
        this.faucetService = faucetService;
    }

    @Operation(
        summary = "Send testnet ETH + MockUSDT to the caller (one per wallet per token)",
        security = @SecurityRequirement(name = "bearer")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Faucet executed, tx hashes returned"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
        @ApiResponse(responseCode = "409", description = "Wallet already claimed the live MockUSDT"),
        @ApiResponse(responseCode = "502", description = "On-chain transaction failed"),
        @ApiResponse(responseCode = "503", description = "Faucet disabled in this environment")
    })
    @PostMapping("/claim")
    public FaucetClaimResponse claim(
        @Parameter(hidden = true) @AuthenticationPrincipal String walletAddress
    ) {
        return faucetService.claim(walletAddress);
    }
}

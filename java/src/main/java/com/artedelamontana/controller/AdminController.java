package com.artedelamontana.controller;

import com.artedelamontana.model.Artwork;
import com.artedelamontana.service.ArtworkService;
import com.artedelamontana.service.StripeService;
import com.stripe.exception.StripeException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Internal endpoint for the artist to mint a private Stripe payment link
 * for an artwork after an inquiry. Protected with a basic shared secret
 * header so it is not callable from the public site.
 */
@Controller
@RequestMapping("/admin")
public class AdminController {

    private final ArtworkService artworkService;
    private final StripeService stripeService;

    @Value("${admin.secret:}")
    private String adminSecret;

    @Autowired
    public AdminController(ArtworkService artworkService, StripeService stripeService) {
        this.artworkService = artworkService;
        this.stripeService = stripeService;
    }

    @GetMapping("/payment-link")
    public String form(@RequestHeader(value = "X-Admin-Secret", required = false) String secret,
                       Model model) {
        if (!authorised(secret)) {
            model.addAttribute("error", "Unauthorised");
            return "admin-error";
        }
        model.addAttribute("artworks", artworkService.all());
        return "admin-payment-link";
    }

    @PostMapping("/payment-link")
    @ResponseBody
    public ResponseEntity<?> create(@RequestHeader(value = "X-Admin-Secret", required = false) String secret,
                                    @RequestParam String slug,
                                    @RequestParam long amountCents,
                                    @RequestParam(required = false) String buyerEmail) {
        if (!authorised(secret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "unauthorised"));
        }
        Artwork art = artworkService.bySlug(slug).orElse(null);
        if (art == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "unknown slug"));
        }
        if (!stripeService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "stripe not configured"));
        }
        try {
            String url = stripeService.createPaymentLink(art, amountCents, buyerEmail);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (StripeException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    private boolean authorised(String secret) {
        return adminSecret != null && !adminSecret.isBlank() && adminSecret.equals(secret);
    }
}

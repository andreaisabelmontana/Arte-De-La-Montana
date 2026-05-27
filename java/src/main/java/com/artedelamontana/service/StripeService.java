package com.artedelamontana.service;

import com.artedelamontana.model.Artwork;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Price;
import com.stripe.model.PaymentLink;
import com.stripe.model.Product;
import com.stripe.param.PriceCreateParams;
import com.stripe.param.PaymentLinkCreateParams;
import com.stripe.param.ProductCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class StripeService {

    @Value("${stripe.api.key:}")
    private String apiKey;

    @Value("${stripe.currency:usd}")
    private String currency;

    @PostConstruct
    void init() {
        if (apiKey != null && !apiKey.isBlank()) {
            Stripe.apiKey = apiKey;
        }
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Creates a one-off PaymentLink for the requested artwork at the price the artist sets in cents.
     * Returns the URL the buyer can use to complete payment.
     */
    public String createPaymentLink(Artwork artwork, long unitAmountCents, String buyerEmail) throws StripeException {
        if (!isConfigured()) {
            throw new IllegalStateException("Stripe API key not configured");
        }

        Product product = Product.create(ProductCreateParams.builder()
                .setName(artwork.title())
                .setDescription(artwork.year() + " " + artwork.medium() + " " + artwork.size())
                .addImage("https://placeholder.invalid" + artwork.assetPath())
                .putMetadata("slug", artwork.slug())
                .putMetadata("buyer", buyerEmail == null ? "" : buyerEmail)
                .build());

        Price price = Price.create(PriceCreateParams.builder()
                .setProduct(product.getId())
                .setUnitAmount(unitAmountCents)
                .setCurrency(currency)
                .build());

        PaymentLink link = PaymentLink.create(PaymentLinkCreateParams.builder()
                .addLineItem(PaymentLinkCreateParams.LineItem.builder()
                        .setPrice(price.getId())
                        .setQuantity(1L)
                        .build())
                .putMetadata("artwork_slug", artwork.slug())
                .putMetadata("buyer_email", buyerEmail == null ? "" : buyerEmail)
                .build());

        return link.getUrl();
    }
}

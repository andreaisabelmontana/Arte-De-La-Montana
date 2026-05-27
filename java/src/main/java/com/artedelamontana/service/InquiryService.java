package com.artedelamontana.service;

import com.artedelamontana.model.Artwork;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class InquiryService {

    private static final Logger log = LoggerFactory.getLogger(InquiryService.class);

    @Value("${inquiry.notify.to:}")
    private String notifyTo;

    @Value("${inquiry.notify.from:}")
    private String notifyFrom;

    private final JavaMailSender mailSender;

    @Autowired
    public InquiryService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void recordInquiry(Artwork artwork, String name, String email, String message) {
        String body = "New inquiry for: " + artwork.title()
                + " (" + artwork.year() + ", " + artwork.medium() + ", " + artwork.size() + ")\n"
                + "Slug: " + artwork.slug() + "\n\n"
                + "From: " + name + " <" + email + ">\n\n"
                + (message == null ? "" : message);

        log.info("Inquiry received:\n{}", body);

        if (notifyTo == null || notifyTo.isBlank() || notifyFrom == null || notifyFrom.isBlank()) {
            log.warn("inquiry.notify.to / inquiry.notify.from not configured; skipping email");
            return;
        }
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(notifyFrom);
            mail.setTo(notifyTo);
            mail.setSubject("Arte de la Montana - Inquiry: " + artwork.title());
            mail.setText(body);
            mailSender.send(mail);
        } catch (Exception e) {
            log.error("Failed to send inquiry email", e);
        }
    }
}

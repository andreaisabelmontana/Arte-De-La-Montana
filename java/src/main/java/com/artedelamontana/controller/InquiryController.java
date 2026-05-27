package com.artedelamontana.controller;

import com.artedelamontana.model.Artwork;
import com.artedelamontana.service.ArtworkService;
import com.artedelamontana.service.InquiryService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class InquiryController {

    private final ArtworkService artworkService;
    private final InquiryService inquiryService;

    @Autowired
    public InquiryController(ArtworkService artworkService, InquiryService inquiryService) {
        this.artworkService = artworkService;
        this.inquiryService = inquiryService;
    }

    public static class InquiryForm {
        @NotBlank public String name;
        @NotBlank @Email public String email;
        public String message;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    @GetMapping("/inquire/{slug}")
    public String inquireForm(@PathVariable String slug, Model model) {
        Artwork art = artworkService.bySlug(slug).orElse(null);
        if (art == null) return "redirect:/collection";
        model.addAttribute("artwork", art);
        model.addAttribute("form", new InquiryForm());
        return "inquire";
    }

    @PostMapping("/inquire/{slug}")
    public String submit(@PathVariable String slug,
                         @ModelAttribute("form") @Valid InquiryForm form,
                         BindingResult bindingResult,
                         Model model) {
        Artwork art = artworkService.bySlug(slug).orElse(null);
        if (art == null) return "redirect:/collection";

        if (bindingResult.hasErrors()) {
            model.addAttribute("artwork", art);
            return "inquire";
        }

        inquiryService.recordInquiry(art, form.name, form.email, form.message);
        model.addAttribute("artwork", art);
        return "inquiry-success";
    }
}

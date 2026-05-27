package com.artedelamontana.controller;

import com.artedelamontana.model.Artwork;
import com.artedelamontana.service.ArtworkService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class GalleryController {

    private final ArtworkService artworkService;

    @Autowired
    public GalleryController(ArtworkService artworkService) {
        this.artworkService = artworkService;
    }

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("grouped", artworkService.byCategory());
        return "home";
    }

    @GetMapping("/andrea")
    public String andrea() {
        return "andrea";
    }

    @GetMapping("/customize")
    public String customize() {
        return "customize";
    }

    @GetMapping("/artwork/{slug}")
    public ModelAndView artwork(@PathVariable String slug) {
        Artwork art = artworkService.bySlug(slug).orElse(null);
        if (art == null) {
            return new ModelAndView("redirect:/");
        }
        ModelAndView mv = new ModelAndView("artwork");
        mv.addObject("artwork", art);
        return mv;
    }
}

package com.artedelamontana.service;

import com.artedelamontana.model.Artwork;
import com.artedelamontana.model.Category;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ArtworkService {

    private static final Pattern FILENAME = Pattern.compile(
            "^(?<title>[a-z0-9-]+?)-(?<year>\\d{4})-(?<medium>[a-z]+)-(?<size>small|medium|large|extralarge)\\.png$");

    private static final Set<String> NON_ARTWORK = Set.of(
            "andean-bear-icon.png", "brown-layout.png", "buttons-example.png",
            "caracas-duplicate.png", "comic-life.png", "cream-layout.png",
            "footer.png", "graffiti-me-icon.png", "graffiti-wallpaper.png",
            "landing.png", "mafalda-1.png", "mafalda-2.png", "mafalda-3.png",
            "mafalda-4.png", "self-portrait-gallery.png",
            "self-portrait-stencil.png", "signature.png", "subtitle.png",
            "title.png", "website-main-title.png", "white-layout.png",
            "white-square-layout.png", "yellow-wallpaper.png",
            "yellow-watercolor.png");

    @Value("${assets.directory}")
    private String assetsDirectory;

    private List<Artwork> artworks = List.of();
    private Map<String, Artwork> bySlug = Map.of();

    @PostConstruct
    void load() {
        File dir = new File(assetsDirectory);
        File[] files = dir.listFiles();
        if (files == null) {
            artworks = List.of();
            bySlug = Map.of();
            return;
        }

        List<Artwork> parsed = new ArrayList<>();
        for (File file : files) {
            String name = file.getName();
            if (NON_ARTWORK.contains(name)) continue;
            Matcher m = FILENAME.matcher(name);
            if (!m.matches()) continue;

            String rawTitle = m.group("title");
            String year = m.group("year");
            String medium = normalizeMedium(m.group("medium"));
            String size = m.group("size");

            Artwork art = new Artwork(
                    fileNameToSlug(name),
                    prettify(rawTitle),
                    year,
                    medium,
                    prettifySize(size),
                    size,
                    name,
                    categorize(medium)
            );
            parsed.add(art);
        }

        parsed.sort(Comparator.comparing(Artwork::year).reversed().thenComparing(Artwork::title));
        artworks = List.copyOf(parsed);
        bySlug = artworks.stream().collect(Collectors.toUnmodifiableMap(Artwork::slug, a -> a));
    }

    public List<Artwork> all() {
        return artworks;
    }

    public Optional<Artwork> bySlug(String slug) {
        return Optional.ofNullable(bySlug.get(slug));
    }

    public Map<Category, List<Artwork>> byCategory() {
        Map<Category, List<Artwork>> grouped = new EnumMap<>(Category.class);
        for (Category c : Category.values()) grouped.put(c, new ArrayList<>());
        for (Artwork a : artworks) grouped.get(a.category()).add(a);
        grouped.values().removeIf(List::isEmpty);
        return grouped;
    }

    public List<Artwork> featured(int n) {
        return artworks.stream().limit(n).toList();
    }

    private static String fileNameToSlug(String filename) {
        return filename.replace(".png", "");
    }

    private static String prettify(String raw) {
        String[] parts = raw.split("-");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
        }
        return sb.toString();
    }

    private static String prettifySize(String s) {
        return switch (s) {
            case "extralarge" -> "Extra large";
            default -> Character.toUpperCase(s.charAt(0)) + s.substring(1);
        };
    }

    private static String normalizeMedium(String m) {
        return switch (m) {
            case "acylic" -> "acrylic";
            case "oilpastel" -> "oil pastel";
            case "drypastel" -> "dry pastel";
            case "colorpencil" -> "colour pencil";
            default -> m;
        };
    }

    private static Category categorize(String medium) {
        return switch (medium) {
            case "acrylic", "oil" -> Category.PAINTINGS;
            case "pencil", "colour pencil", "pen" -> Category.DRAWINGS;
            case "oil pastel", "dry pastel" -> Category.PASTELS;
            case "alcohol" -> Category.MARKERS;
            case "ceramic" -> Category.CERAMICS;
            default -> Category.PAINTINGS;
        };
    }
}

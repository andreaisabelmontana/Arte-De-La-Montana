package com.artedelamontana.model;

public record Artwork(
        String slug,
        String title,
        String year,
        String medium,
        String size,
        String sizeKey,
        String filename,
        Category category
) {
    public String assetPath() {
        return "/assets/" + filename;
    }
}

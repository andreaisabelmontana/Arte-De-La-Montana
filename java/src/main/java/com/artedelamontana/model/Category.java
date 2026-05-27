package com.artedelamontana.model;

public enum Category {
    PAINTINGS("Paintings"),
    POSTCARDS("Postcards"),
    DRAWINGS("Drawings"),
    PASTELS("Pastels"),
    MARKERS("Markers"),
    CERAMICS("Ceramics");

    private final String label;

    Category(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}

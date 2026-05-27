package com.artedelamontana.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${assets.directory}")
    private String assetsDirectory;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + new File(assetsDirectory).getAbsolutePath() + File.separator;
        // cachePeriod 0 = always re-read from disk; we want changes to image files to show up immediately
        registry.addResourceHandler("/assets/**").addResourceLocations(location).setCachePeriod(0);
    }
}

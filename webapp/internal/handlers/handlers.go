// handlers.go

package handlers

import (
    "net/http"

    "weblock/internal/templates"
)

func IndexHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        templates.Index().Render(r.Context(), w)
    }
}

func FarmHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		templates.Farm().Render(r.Context(), w)
	}
}

func MapHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		templates.Map().Render(r.Context(), w)
	}
}

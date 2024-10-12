// handlers.go

package handlers

import (
    //"fmt"
    "net/http"
    "os"
    //"path/filepath"
    //"strings"

    "weblock/internal/templates"
    "github.com/gomarkdown/markdown"
)

func renderMarkdown(filePath string) (string, error) {
    content, err := os.ReadFile(filePath)
    if(err != nil) { 
        return "", err
    }
    message := string(markdown.ToHTML(content, nil, nil))
    return message, nil
}

func IndexHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		templates.Index().Render(r.Context(), w)
	}
}

func ResourcesHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        content, err := renderMarkdown("./md/resources.md")
        if(err != nil) {
            http.NotFound(w, r)
            return
        }
        templates.Commands(content).Render(r.Context(), w)
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

func CommandsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
        //message := "<h1>test<n1>"
        ////path := strings.TrimPrefix(r.URL.Path, "/md/commands.md")
        //content, err := os.ReadFile("./md/commands.md")
        ////fmt.Println(content)
        //if(err != nil) {
        //    http.NotFound(w, r)
        //    return
        //}
        //message = string(markdown.ToHTML(content, nil, nil))
        ////fmt.Println(string(content))
        //templates.Commands(string(message)).Render(r.Context(), w)
        content, err := renderMarkdown("./md/commands.md")
        if(err != nil) {
            http.NotFound(w, r)
            return
        }
        templates.Commands(content).Render(r.Context(), w)
	}
}

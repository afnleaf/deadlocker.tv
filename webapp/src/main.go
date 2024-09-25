package main

import (
   "log"
    "net/http"
)

// static file server
func main() {
    fs := http.FileServer(http.Dir("./public"))
    http.Handle("/", fs)

    log.Println("Serving on http://localhost:4444")
    if err := http.ListenAndServe(":4444", nil); err != nil {
        log.Fatal(err)
    }
}
 

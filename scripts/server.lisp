(ql:quickload '(:cl-async :wookie))

(defpackage :turtl-server
  (:use :cl :wookie :wookie-plugin-export))
(in-package :turtl-server)

(load-plugins)

(defun file-contents (path)
  "Sucks up an entire file from PATH into a freshly-allocated string,
   returning two values: the string and the number of bytes read."
  (with-open-file (s path)
    (let* ((len (file-length s))
           (data (make-string len)))
      (values data (read-sequence data s)))))

(defun load-index (res)
  (let ((body (file-contents "index.html")))
    (send-response res :body body :headers '(:content-type "text/html"))))

(defroute (:get "/") (req res)
  (load-index res))

(def-directory-route "/" "./")

(defroute (:get ".*") (req res)
  (load-index res))

(as:with-event-loop (:catch-app-errors t)
  (start-server (make-instance 'listener :port 8185)))


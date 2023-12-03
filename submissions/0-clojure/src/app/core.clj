(ns app.core
  (:gen-class))
(use 'clojure.string)

(defn -main []
  (let [first-words
      (->> (line-seq (java.io.BufferedReader. *in*))
            (map #(->> (split % #" ") first))
            (remove nil?)
            (clojure.string/join " "))]
  (println first-words)))
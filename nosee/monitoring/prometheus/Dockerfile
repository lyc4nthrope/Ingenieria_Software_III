FROM prom/prometheus:v2.47.0
COPY prometheus.cloud.yml /etc/prometheus/prometheus.yml
EXPOSE 9090
CMD ["--config.file=/etc/prometheus/prometheus.yml", \
     "--storage.tsdb.path=/prometheus", \
     "--web.console.libraries=/usr/share/prometheus/console_libraries", \
     "--web.console.templates=/usr/share/prometheus/consoles", \
     "--web.listen-address=:9090"]

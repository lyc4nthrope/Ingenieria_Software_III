FROM prom/prometheus:v2.47.0
COPY prometheus.cloud.yml /etc/prometheus/prometheus.yml
EXPOSE 9090
ENTRYPOINT ["/bin/sh", "-c", "exec /bin/prometheus --config.file=/etc/prometheus/prometheus.yml --web.listen-address=:${PORT:-9090} --storage.tsdb.path=/prometheus --storage.tsdb.retention.time=15d"]

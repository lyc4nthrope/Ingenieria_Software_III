FROM grafana/grafana:10.1.5
ENV PROMETHEUS_URL=http://prometheus:9090
COPY provisioning /etc/grafana/provisioning
COPY dashboards /var/lib/grafana/dashboards
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "-c", "GF_SERVER_HTTP_PORT=${PORT:-3000} /run.sh"]

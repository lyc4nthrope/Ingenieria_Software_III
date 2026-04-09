FROM grafana/grafana:10.1.5
ENV PROMETHEUS_URL=http://prometheus:9090
ENV GF_SERVER_HTTP_PORT=3000
COPY provisioning /etc/grafana/provisioning
COPY dashboards /var/lib/grafana/dashboards
EXPOSE 3000

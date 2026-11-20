###########
# WebVOWL #
###########

# NOTE: this image serves the upstream WebVOWL 1.1.7 war, not the modern
# explorer in this repository. It fails closed: the build stops unless the war
# is fetched over HTTPS and matches an operator-supplied SHA-256.
#
#   docker build --build-arg WEBVOWL_WAR_URL=<https url> \
#                --build-arg WEBVOWL_WAR_SHA256=<64 hex chars> .
#
# The original download host (vowl.visualdataweb.org) now redirects to an
# unrelated site and the upstream GitHub release carries no war asset, so no
# trusted default URL or checksum is published here (W4COVC-F5).

# Use tomcat java 8 alpine as base image
FROM tomcat:9-jre8-alpine

ARG WEBVOWL_WAR_URL
ARG WEBVOWL_WAR_SHA256

RUN rm -rf /usr/local/tomcat/webapps/* && \
    case "$WEBVOWL_WAR_URL" in https://*) ;; *) echo "WEBVOWL_WAR_URL must be an https:// URL" >&2; exit 1;; esac && \
    [ -n "$WEBVOWL_WAR_SHA256" ] || { echo "WEBVOWL_WAR_SHA256 is required" >&2; exit 1; } && \
    wget -O /usr/local/tomcat/webapps/ROOT.war "$WEBVOWL_WAR_URL" && \
    echo "$WEBVOWL_WAR_SHA256  /usr/local/tomcat/webapps/ROOT.war" | sha256sum -c -

# Run default server
CMD ["catalina.sh", "run"]

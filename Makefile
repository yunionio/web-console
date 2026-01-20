build:
	yarn install
	yarn run build

docker-build:
	./scripts/docker-build.sh

REGISTRY ?= "registry.cn-beijing.aliyuncs.com/yunionio"
VERSION ?= $(shell git describe --exact-match 2> /dev/null || \
                git describe --match=$(git rev-parse --short=8 HEAD) --always --dirty --abbrev=8)

image: build
	docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile -t $(REGISTRY)/web-console-fe:$(VERSION) . --push

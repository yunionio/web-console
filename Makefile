build:
	yarn install
	yarn run build

REGISTRY ?= "registry.cn-beijing.aliyuncs.com/yunionio"
VERSION ?= "v3.12-20240920.1"

image: build
	docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile -t $(REGISTRY)/web-console-fe:$(VERSION) . --push

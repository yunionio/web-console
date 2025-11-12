build:
	yarn install
	yarn run build

REGISTRY ?= "registry.cn-beijing.aliyuncs.com/yunionio"
VERSION ?= "v4.0.0-20251112.0"
platform ?= linux/amd64,linux/arm64,linux/riscv64

image: build
	docker buildx build --platform $(platform) -f Dockerfile -t $(REGISTRY)/web-console-fe:$(VERSION) . --push

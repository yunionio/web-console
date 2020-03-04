build:
	yarn install
	yarn run build

REGISTRY ?= "registry.cn-beijing.aliyuncs.com/yunionio"
VERSION ?= $(shell git describe --exact-match 2> /dev/null || \
                git describe --match=$(git rev-parse --short=8 HEAD) --always --dirty --abbrev=8)

image: build
	sudo docker build -f Dockerfile -t $(REGISTRY)/web-console-fe:$(VERSION) .
	sudo docker push $(REGISTRY)/web-console-fe:$(VERSION)

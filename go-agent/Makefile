# CortexOps Go Agent — Build Commands

.PHONY: build test run build-lambda deploy clean

# Build HTTP server mode (local dev)
build:
	go build -v -o go-agent .

# Run all tests
test:
	go test -v ./...

# Run HTTP server locally
run:
	export $$(grep -v '^#' .env | xargs) && go run .

# Build Lambda binary (linux/arm64 for AWS Lambda)
build-lambda:
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bootstrap ./cmd/lambda/
	@echo "✅ Lambda binary built: ./bootstrap"
	@echo "   Deploy with: sam deploy --guided"

# Deploy to AWS via SAM
deploy: build-lambda
	sam deploy --guided --template-file template.yaml

# Clean build artifacts
clean:
	rm -f go-agent bootstrap
	rm -rf .aws-sam/

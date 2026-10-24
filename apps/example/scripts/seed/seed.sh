#!/usr/bin/env bash
# Creates (or updates, by handle) the test products and publishes them to a Headless channel.
#
# Prerequisite, once per store (opens a browser to grant the scopes):
#   npx @shopify/cli@4.9.4 store auth --store <store>.myshopify.com \
#     --scopes read_products,write_products,read_publications,write_publications
#
# Usage: scripts/seed/seed.sh <store>.myshopify.com ["Publication name"]
set -euo pipefail

STORE="${1:?usage: seed.sh <store>.myshopify.com [publication name]}"
PUBLICATION="${2:-Headless}"
DIR="$(cd "$(dirname "$0")" && pwd)"
SHOPIFY=(npx -y @shopify/cli@4.9.4 store execute -s "$STORE" --no-input -j)

# Prints the value at a dotted path of the JSON on stdin (the CLI prints progress lines first).
json_get() {
	node -e '
		const text = require("fs").readFileSync(0, "utf8");
		const value = process.argv[1].split(".").reduce((o, k) => o?.[k], JSON.parse(text.slice(text.indexOf("\n{") + 1)));
		if (value === undefined) process.exit(1);
		process.stdout.write(typeof value === "string" ? value : JSON.stringify(value));
	' "$1"
}

publication_id=$("${SHOPIFY[@]}" --query-file "$DIR/publications.graphql" | node -e '
	const text = require("fs").readFileSync(0, "utf8");
	const { publications } = JSON.parse(text.slice(text.indexOf("\n{") + 1));
	const match = publications.nodes.find((p) => p.name.includes(process.argv[1]));
	if (!match) { console.error(`No publication matching "${process.argv[1]}"`); process.exit(1); }
	process.stdout.write(match.id);
' "$PUBLICATION")

for variables in "$DIR"/test-*.json; do
	result=$("${SHOPIFY[@]}" --allow-mutations --query-file "$DIR/product-set.graphql" --variable-file "$variables")
	errors=$(json_get productSet.userErrors <<<"$result")
	[[ "$errors" == "[]" ]] || { echo "$(basename "$variables"): $errors" >&2; exit 1; }
	product_id=$(json_get productSet.product.id <<<"$result")

	"${SHOPIFY[@]}" --allow-mutations --query-file "$DIR/publish.graphql" \
		-v "{\"id\":\"$product_id\",\"publicationId\":\"$publication_id\"}" >/dev/null
	echo "$(json_get productSet.product.handle <<<"$result") -> $product_id"
done

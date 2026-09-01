I will now make an important refactor for how the current system obtains the itemCategory. the way it currently works can be found at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/docs/under_implementation/refactor_item_category/context/context.md

The current system tries to obtain the itemCategory through a shopify product metafield, we will no longer do this, we will now target the productType , if not found then we continue to fall back on item title mapping.
and example of how shopify response comes back with the productType is as follows:
davidloorenz@Mac Item-Scanner-Shopify % curl -s -X POST \
 "https://68c5b4-6a.myshopify.com/admin/api/2026-07/graphql.json" \
 -H "X-Shopify-Access-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  --data "$(jq -n \
 --arg query 'query SearchBySku($query: String!) {
      productVariants(first: 10, query: $query) {
        edges {
          node {
            id
            sku
            title
            product {
              id
              title
              handle
              productType
              category {
                id
                name
                fullName
              }
              vendor
              tags
              status
            }
          }
        }
      }
    }' \
    --arg sku "$SKU" \
 '{query: $query, variables: {query: ("sku:" + $sku)}}'
)" | jq
{
"data": {
"productVariants": {
"edges": [
{
"node": {
"id": "gid://shopify/ProductVariant/63365537038666",
"sku": "Ch6-280826",
"title": "Default Title",
"product": {
"id": "gid://shopify/Product/16002680619338",
"title": "Danish dining chairs in teak and oak, model 32 by Kai Kristiansen for Korup Stolefabrik",
"handle": "ch6-280826",
"productType": "Dining Chairs",
"category": {
"id": "gid://shopify/TaxonomyCategory/na",
"name": "Uncategorized",
"fullName": "Uncategorized"
},
"vendor": "Beyo Vintage",
"tags": [
"price"
],
"status": "ACTIVE"
}
}
}
]
}
},
"extensions": {
"cost": {
"requestedQueryCost": 14,
"actualQueryCost": 4,
"throttleStatus": {
"maximumAvailable": 2000.0,
"currentlyAvailable": 1996,
"restoreRate": 100.0
}
}
}
}
davidloorenz@Mac Item-Scanner-Shopify %

---

I will like you to come up with a plan for how we will make this change clean and reliable ( with out over complicating it ), after i have review it you will be implementing it. keep the plan easy to read, with examples if need it to explain

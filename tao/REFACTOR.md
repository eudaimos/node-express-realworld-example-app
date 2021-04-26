# Steps taken to Refactor the API

1. Know how it works
2. Map the Endpoints
3. Identify Dependencies

## Know how it works

It's very important to start any refactor we have to investigate and learn how the API works.

This particular API is using Express to create a REST API and Mongoose to create Models that
it will persist in a MongoDB database.

We need to review how the Express API is instantiated and the endpoints are configured.
What middleware is added to the Express app, especially for authorization (in this case our
old stalwart friend `passport` is used).

We then need to understand how the Mongoose Models are created and configured, and what methods
are being attached to those Models since those will be expected to be used by the API's endpoints.

## Map the Endpoints

After we knowing how the API works we need to map the endpoints to some trigrams in order to
describe the flow we are after.

This is an iterative process that you won't get right the first time. Fortunately, TAO makes it
easy to iterate and break our project down into smaller and smaller bite sized pieces.

## Identify Dependencies

Many of the Endpoints have a dependency on not just knowing who the authorized user is that is
making the request, they rely on having the `User` Model hydrated from the database because
they make use of methods attached to the model, so I mapped all of these uses across the board.

This meant that any requests that make use of an authorized user should have that `User` model
hydrated and available in the `portal` context data.

## Create any Supporting Flows

As we found out, we need to create a supporting flow to get the Authorized `User` model into our
`portal` context data so it can be used by all of our other handlers for `portal` orientations.

# winterkit

Disclaimer: This is a work in progress. It is not ready for production use.

The primary motivation for this project is to build a foundation for server-side Javascript frameworks. The goal is to provide a set of tools that can be used to build a framework that is easy to use, easy to extend, and they don't have to maintain it

## @winterkit/vite (imaginary)

Integrate with your framework's vite preset:

It actually doesnt need to be passed an options on construction since its possible that some of this is config driven. If you add a config that sets the `winter` field in the vite config, this plugin will pick up the configuration from there.

### Usage

```js
import { winter } from '@winterkit/vite'

export default defineConfig({
  plugins: [winter({
    entry: 'src/entry-server.ts'
    build: {
      static: '.solid/client',
    },
    adapter: vercelWinter({
      edge: true
    })
  })],
})
```


```js
import { winter } from '@winterkit/vite'

export default defineConfig({
  plugins: [winter()],
  winter: {
    entry: 'src/entry-server.ts'
    build: {
      static: '.solid/client',
    },
    adapter: vercelWinter({
      edge: true
    })
  }
})
```

## Ideas

[ ] Tests for standard runtime APIs, eg. Fetch API, Streams API, Crypto API. Run these on actual environments by deploying an app to each platform, for various configs. And then make HTTP requests to them and during the request, tests with run and assert behaviour. No mocking anywhere. This is a good way to test the runtime, and also a good way to test the platforms.

[ ] Vite plugin: 
  - Take a server entry (server equivalent of `index.html`) and use it to drive the dev server. 
    - HMR for the server
    - Server-side rendering with Vite plugins applied
  - Build the server with vite using the server entry and then bundle using the `adapter`
  - Use the `adapter` to deploy the server, it knows how to use the various CLIs

[ ] Tests for standard runtime APIs, eg. Fetch API, Streams API, Crypto API. Run these on actual environments by deploying an app to each platform, for various configs. And then make HTTP requests to them and during the request, tests with run and assert behaviour. No mocking anywhere. This is a good way to test the runtime, and also a good way to test the platform.
  - Unit tests for the runtime, 
    - each runtime should run the test suite in a native environment, and be able to report back the results
    - each platform should run the test suite in a native environment, and be able to report back the results
  - Integration tests for the platform

## Why?

Each modern framework is slowly adopting the [Web Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) as the server runtime API along with other Web Standard APIs. This is an awesome direction for the web and an amazing foundation for full-stack Javascript apps to be built on.


There is a lot of duplicate work that a bunch of frameworks like SolidStart, Remix, SvelteKit, Astro, QwikCity, Nuxt, Next have done to support the Web Fetch API. The challenge is the variety of Javascript server runtimes available for developers to use:

- Node (Docker, Fly)
- Deno + Deno Deploy
- Bun
- Cloudflare Workers/Pages
- Vercel Serverless/Edge
- Netlify Serverless/Edge

And on top of that you also need to build some kind of custom server runtime for your framework. Then adapt it to the various platforms/runtimes. There is some work going on in this space. Vercel recently came out with the Build Output API. The Service Worker API is also popular amongst some frameworks.

All the frameworks have an adapter layer that takes the user's server entry and bundles it along with a framework entry to build somthing that complies with the provider. This is more integrated into the build setup as well, and might be more difficult to converge on.

I think we should try to minimize the differences on the core runtime APIs like the Web Fetch API, FormData API, WebCrypto API. The challenge is to make all the platforms/runtimes adapt to these APIs. Many providers already have a modern edge runtime that supports some or all of these APIs so we are off to a good start.

One way to go here is to have packages for the various providers and runtimes like `winter-vercel`, `winter-netlify`, `winter-cloudflare-pages`, `winter-cloudflare-workers`, `winter-node` that takes the platform server runtime and adapts it to the Web Fetch API. This would be mostly be polyfills + helper functions to transform platform native objects to standard objects. Not build tools. They could help with setting up the platform-specific code with helper functions, eg. setup the worker function (with static files, etc) for `cloudflare-workers`. There is little opinion to be had here and very worthwhile getting to the best way of doing it correctly. These will not be adapters themselves but ideally used by the adapters of the frameworks.


### Benefits:

- APIs like the SessionStorage API from Remix (we already love it at SolidStart) can be used by different frameworks to build a common API surface layer, eg. `winter-session`
- Amazing libraries built on these APIs can be used by users of all frameworks.. kindof like vite plugins for all the vite frameworks.
  - [sergiodxa/remix-auth](https://github.com/sergiodxa/remix-auth), [sergiodxa/remix-auth-oauth0](https://github.com/sergiodxa/remix-auth-oauth2) -> maybe they reappear as`winter-auth`, `winter-auth-oauth0`?
- Security: This is probably the most major concern that makes this so worthwhile.. having all the framework contributors working to fix security issues in this layer is better for everybody. We are all going to keep bashing the same bugs.
- True dev environments: For `cloudflare-workers`, we added a way to have a miniflare dev environment which calls back into vite code and can create a Cloudflare worker dev environment with Durable Object, KV Namespace supports, etc. This is also something that is very valuable to get working for everybody for their adapters. Integrating with a node environment basically.
- Platforms/runtimes will be incentivized to contribute to one common layer instead of trying to make sure every framework does the job well.
- Common test suite for these integral APIs and components

### Other usecases:

- A standard way of adding static files to the deployment,
- Using a standard static routing thing that things like vercel and netlify have supported.
- Add more capabilities like image optimization, websockets that work on as many platforms/runtimes as possible

### Usage

We think its not worth it to try to standardize any build setup or dev environment. Use `vite`, `esbuild`, `webpack`, etc whatever, `winter-*` would just be bunch of server runtime libraries that you can either reexport from your framework, or have the users install it. Additionally you could use the runtime adapters and polyfills to remove some code from your adapter layer. Just import these dependencies in there and get the security, stability, and performance benefits of the standard solutions that will emerge.

We also think its worth just shipping with typescript source that users can easily `patch-package` when something doesn't work for them. Easy to fork.

### Why the name?

Its an ode to the newly formed [WinterCG](https://wintercg.org/). Its a collaboration between the various Javascript server runtime providers in an effort to reach some convergence on the APIs.

## Important APIs:

- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), eg. `fetch`, `Request`, `Response`, `Headers`
- [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API), eg. `ReadableStream`, `WritableStream`, `TransformStream`
- [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData), eg. `FormData`, `request.formData()`
- [URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL_API), eg. `URL`

### Additional APIs:
- [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) eg. `crypto.subtle`

There are also certain issues in the WinterCG fetch repo that we could deal with temporarily:
- [Multipart parsing for Request.formData on the server](https://github.com/wintercg/fetch/issues/9)

# Adam Laycock

This is a fork of the [Next.js Notion Starter Kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit), feel free to submit changes, but definitely port anything substantial back to the main project.

## Differences from the original repo

- This fork statically generates the site so it can be hosted on Github pages
- Images are fetched from Notion and served from the public folder. This allows me to leave my
  Notion page unpublished.
- `manifest.json` is deliberately malformed to prevent the browser from suggesting installation

## Future improvements

- Add tracking
- "Trip reports" should show the fields from the related "adventures" page
  - The relation property exists in notion, but showing properties across pages isn't supported -
    it requires changes to how `notion.getPage`. Look into the "backlinks" API in Notion.
- Social images were disabled due to the lack of server, would be nice to reintroduce via static
  generation.
- Image optimization isn't great, the landing page is fetching large images unnecessarily.

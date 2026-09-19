# CAD internal tester preview

## Decision

Use a dedicated Vercel preview deployment for Mark's first CAD Import review. The
preview is synthetic-only and replays the accepted public-cube qualification result
inside the real app UI. It does not mount the upload route, dispatch conversion,
read a selected file, create an account, or write to a store.

The direct route is:

`https://<preview-host>/?cadPreview=public-cube-v1`

The mode is accepted only on `localhost`, `127.0.0.1`, or a non-production
`*.vercel.app` hostname. `https://reversr.vercel.app` rejects the mode even when
the query string is present.

## Review scope

- fixed public cube only: IGES, 11,562 bytes
- accepted source SHA-256:
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`
- recorded result: one mesh, 24 vertices, 12 triangles
- source confidence remains unqualified
- no arbitrary or private file picker in preview mode
- no upload, conversion, Sandbox dispatch, auth enrollment, external delivery, or
  provider/store mutation

## Rollback and support

Delete or close the preview deployment and remove its branch alias. The production
app is unaffected because the hostname guard denies this mode. Vambah is the support
owner for the review; Mark remains tester/reviewer and is not a custodian.

## Remaining human gate

After the preview deployment and captain visual QA pass, separately decide whether
to send the exact preview URL to Mark. That delivery does not authorize private CAD,
real upload activation, production conversion, or account enrollment. A later
mounted development upload path needs its own implementation and qualification.

## Installed-app internal upload-render preview

The current Android internal tester path is the installed-app internal IGS preview,
not the older public-cube browser fixture. It embeds the production-hosted renderer
route:

`https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&qa=native-internal-upload-render`

The renderer route stays bounded to public/authorized material and local file
preview behavior. It does not activate production upload sessions, backend
conversion, Sandbox processing, private CAD handling, or commercial CAD output.

The native build profile `cad-internal-upload-preview` includes
`EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL`, but JS-only EAS updates do not
inherit that build-profile `env` block. When publishing a JS-only update to the
existing internal preview channel, inject the same public URL in the update
command:

```bash
CI=1 \
EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL='https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&qa=native-internal-upload-render' \
npx eas-cli@20.0.0 update \
  --channel cad-internal-upload-preview \
  --environment preview \
  --platform android \
  --message "CAD internal upload-render preview update" \
  --non-interactive
```

Do not run `npx eas-cli@20.0.0 update --channel cad-internal-upload-preview
--environment preview --platform android` without the public renderer URL in the
local environment. That can ship a bundle where the installed app opens the
wrapper but fails closed with `Internal preview unavailable`.

Installed-app QA remains distinct from web production proof. A passing web
deployment or Vercel route smoke does not prove the installed Android bundle has
received the correct EAS update. Verify the installed app on a connected Android
device before sending or correcting tester instructions.

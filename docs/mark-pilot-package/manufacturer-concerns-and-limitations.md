# Manufacturer concerns and limits

The useful question is not whether a model appeared on screen. The useful
question is whether the evidence is strong enough for the next manufacturing
decision. For this pilot, the answer stops at visual and workflow review.

For a 2D printing manufacturer, the closest working analogy is source artwork,
proof, and production release. The original IGS is the authoritative source in
this review. The derived STL is a proof-like inspection artifact. Neither one
supplies the material, color, trim, bleed, finishing, machine, or acceptance
instructions that would release a 2D print job, and the analogy does not make
the STL authoritative CAD.

| Concern | What the public fixture establishes | What remains unproved |
| --- | --- | --- |
| Source identity | The source is the exact 701,346-byte `Dispenser.IGS` file with SHA-256 `1e52b301…50f0b8`. The format is IGES and the source reports millimeter units. | Drawing revision, release status, design intent, authoring-system accuracy, and authority to manufacture the design. A hash identifies bytes; it does not approve them. |
| Geometry provenance | The importer reports bounds of `55.7403 × 69.417713 × 114.825561 mm`, 7,902 vertices, 2,634 triangles, and four connected geometry components. | Dimensional inspection, critical dimensions, datum scheme, tolerances, feature intent, part count, fit, or assembly behavior. |
| Conversion lineage | The committed manifest binds `dispenser-derived.stl` to the source SHA-256 and gives the STL its own SHA-256, `9b5bfa4b…e7b8096e`. | The current fixture record does not name the exact converter version, conversion settings, tessellation tolerance, operator, or conversion timestamp for this source/STL pair. |
| STL usefulness | The STL can support visual inspection and controlled viewer QA. The mesh has 2,634 triangles and four connected components. | It is not fully watertight. The package does not prove scale preservation through a downstream slicer, manifold repair, feature fidelity, printer compatibility, or production usefulness. |
| Reference images | Front, left, top, and drawing images are separately hash-bound visual references. | They do not change the source geometry, prove orientation, validate dimensions, or resolve conflicts between the source and the images. |
| Privacy | The tour uses checked-in public assets. Starting the tour does not activate private upload, backend conversion, Sandbox dispatch, or a provider call. | This public-fixture session does not qualify a private-file workflow, account boundary, retention process, deletion process, or provider custody. |
| Cleanup | No private CAD enters this pilot, so there is no private CAD artifact to delete. Restart resets the guide to the same public fixture; closing saves guide progress on the device. | The public-fixture behavior cannot prove cleanup, revocation, or deletion for a later private upload. Those need their own observed receipts. |
| File rights | The repository records source-provider permission to redistribute this fixture for public review. | That permission is not proof that ReversR owns every underlying design right or that a manufacturer has authority to fabricate it. A later Mark-owned file needs separate authority and consent. |
| Manufacturing status | Build remains locked and the tour ends with a hold for engineering and manufacturing review. | No quote release, vendor package, purchase order, fabrication approval, or manufacturing certification is created. |

## What ReversR does not certify

This pilot does not certify:

- dimensions or tolerances;
- material, grade, or process selection;
- threads, inserts, fasteners, or mating features;
- surface finish or post-processing;
- wall thickness, minimum feature size, or structural performance;
- supports, build orientation, nesting, or machine settings;
- watertightness, manifold repair, sliceability, or printability;
- fabrication readiness, quote readiness, or production release.

A successful viewing or conversion event means the system produced a reviewable
artifact. Manufacturing readiness still requires authoritative drawings,
engineering decisions, process-specific checks, and the manufacturer's own
acceptance criteria.

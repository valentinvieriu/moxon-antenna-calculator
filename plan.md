# STL → OpenSCAD Reconstruction Plan

- [x] Inspect source mesh (`public/moxon_868mhz.stl`) and collect bounds / projection sanity checks.
- [x] Attempt procedural reconstruction from `lib/moxon-stl-generator.ts` logic.
  - [x] Measured failure (~21.59 mm symmetric max error), rejected.
- [x] Attempt wrapper-import approach.
  - [x] Rejected as non-reconstruction (does not satisfy intent).
- [x] Build a reusable STL→OpenSCAD mesh tool (`tools/stl_to_scad_polyhedron.py`) to reconstruct geometry as native OpenSCAD polyhedron data.
- [x] Generate reusable mesh dataset (`public/moxon_868mhz_mesh_data.scad`).
- [x] Build modular final OpenSCAD assembly (`public/moxon_868mhz_reconstructed.scad`) with surfaced customizer constants (transform + options).
- [x] Export reconstructed STL (`public/moxon_868mhz_reconstructed.stl`) from OpenSCAD.
- [x] Validate reconstructed STL against source STL with bidirectional proximity check (target ≤ 0.1 mm).
- [x] Commit and open PR.

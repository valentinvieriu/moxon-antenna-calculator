// Moxon 868 MHz - OpenSCAD reconstruction wrapper
// Uses the provided STL as the geometric baseline while exposing reusable controls.
// Units: millimeters

/* [Source mesh] */
source_stl = "moxon_868mhz.stl";

/* [Placement] */
position_mm = [0, 0, 0];
rotation_deg = [0, 0, 0];
scale_xyz = [1, 1, 1];

/* [Processing] */
convexify = false; // Optional: enable for fast coarse hull previews.

module source_mesh(path = source_stl) {
  import(path, convexity = 10);
}

module processed_mesh(path = source_stl) {
  if (convexify) {
    hull() source_mesh(path);
  } else {
    source_mesh(path);
  }
}

module moxon_868_reconstruction(path = source_stl,
                                pos = position_mm,
                                rot = rotation_deg,
                                scl = scale_xyz) {
  translate(pos)
    rotate(rot)
      scale(scl)
        processed_mesh(path);
}

moxon_868_reconstruction();

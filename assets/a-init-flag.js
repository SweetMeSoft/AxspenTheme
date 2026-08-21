/* Atlas deferred script phase marker.
   Loaded as the first deferred script in atlas-dependencies.
   Host theme deferred scripts (from <head>) execute before this,
   so window.__atlas_scripts_phase distinguishes host theme vs atlas scripts. */
window.__atlas_scripts_phase = true;

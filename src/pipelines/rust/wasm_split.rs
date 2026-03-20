use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashMap},
    path::{Path, PathBuf},
};

pub(crate) const SPLIT_LOADER_STEM: &str = "__wasm_split";
pub(crate) const SPLIT_MANIFEST_STEM: &str = "__wasm_split_manifest";

#[derive(Debug, Clone)]
pub(crate) struct WasmSplitStageOutput {
    pub(crate) main_wasm_path: PathBuf,
    pub(crate) split_loader_output: String,
    pub(crate) split_manifest_output: String,
    pub(crate) split_wasm_outputs: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) struct WasmSplitManifest {
    pub(crate) loader: String,
    pub(crate) prefetch_map: BTreeMap<String, Vec<String>>,
}

pub(crate) fn hashed_file_name(stem: &str, ext: &str, bundle_hash: Option<&str>) -> String {
    match bundle_hash {
        Some(bundle_hash) => format!("{stem}-{bundle_hash}.{ext}"),
        None => format!("{stem}.{ext}"),
    }
}

pub(crate) fn split_loader_file_name(bundle_hash: Option<&str>) -> String {
    hashed_file_name(SPLIT_LOADER_STEM, "js", bundle_hash)
}

pub(crate) fn split_manifest_file_name(bundle_hash: Option<&str>) -> String {
    hashed_file_name(SPLIT_MANIFEST_STEM, "json", bundle_hash)
}

pub(crate) fn split_wasm_file_name(path: &Path, bundle_hash: Option<&str>) -> Result<String> {
    let stem = path
        .file_stem()
        .context("wasm-split module is missing a file stem")?
        .to_string_lossy();
    Ok(hashed_file_name(&stem, "wasm", bundle_hash))
}

pub(crate) fn rewrite_loader_paths(
    mut source: String,
    chunk_renames: &HashMap<String, String>,
) -> String {
    let mut renames: Vec<_> = chunk_renames.iter().collect();
    renames.sort_by_key(|(from, _)| std::cmp::Reverse(from.len()));

    for (from, to) in renames {
        source = source.replace(&format!("./{from}"), &format!("./{to}"));
    }

    source
}

pub(crate) fn rewrite_prefetch_map(
    prefetch_map: HashMap<String, Vec<String>>,
    file_renames: &HashMap<String, String>,
) -> Result<BTreeMap<String, Vec<String>>> {
    prefetch_map
        .into_iter()
        .map(|(split, files)| {
            let files = files
                .into_iter()
                .map(|file| {
                    file_renames.get(&file).cloned().with_context(|| {
                        format!(
                            "missing hashed split output for prefetch map entry '{split}' -> '{file}'"
                        )
                    })
                })
                .collect::<Result<Vec<_>>>()?;

            Ok((split, files))
        })
        .collect()
}

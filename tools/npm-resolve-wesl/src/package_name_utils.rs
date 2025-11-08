/// Generate npm package name variations from sanitized WESL identifier.
///
/// Uses double-underscore encoding to distinguish scoped vs unscoped packages:
/// - Has __ → scoped package (try @scope/pkg variants)
/// - No __ → unscoped package (try pkg variants)
///
/// Examples:
///   "lygia__shader_utils" → ["@lygia/shader_utils", "@lygia/shader-utils"]
///   "random_wgsl" → ["random_wgsl", "random-wgsl"]
pub fn npm_name_variations(sanitized_path: &str) -> Vec<String> {
    let (pkg, sub) = break_at(sanitized_path, "/");

    let (scope_prefix, pkg_name) = if pkg.contains("__") {
        // Scoped npm package (@scope/pkg)
        let parts: Vec<&str> = pkg.split("__").collect();
        let scope = parts[0];
        let name = parts[1..].join("__");
        (format!("@{}/", scope), name)
    } else {
        (String::new(), pkg.to_string())
    };

    vec![
        format!("{}{}{}", scope_prefix, pkg_name, sub),
        format!("{}{}{}", scope_prefix, pkg_name.replace('_', "-"), sub),
    ]
}

fn break_at(s: &str, delimiter: &str) -> (String, String) {
    if let Some(index) = s.find(delimiter) {
        (s[..index].to_string(), s[index..].to_string())
    } else {
        (s.to_string(), String::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_npm_name_variations() {
        let variations = npm_name_variations("random_wgsl");
        assert_eq!(variations, vec!["random_wgsl", "random-wgsl"]);

        let variations = npm_name_variations("lygia__shader_utils");
        assert_eq!(
            variations,
            vec!["@lygia/shader_utils", "@lygia/shader-utils"]
        );
    }

    #[test]
    fn test_break_at() {
        assert_eq!(
            break_at("foo/bar", "/"),
            ("foo".to_string(), "/bar".to_string())
        );
        assert_eq!(break_at("foo", "/"), ("foo".to_string(), String::new()));
    }
}

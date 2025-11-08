use crate::{WeslBundle, WeslResolveError};
use oxc_allocator::Allocator;
use oxc_ast::ast::*;
use oxc_ast::visit::Visit;
use oxc_parser::Parser;
use oxc_span::SourceType;
use std::fs;
use std::path::Path;

/// Parse a weslBundle.js file to extract the bundle data.
///
/// This reads and parses a JavaScript file that exports a `weslBundle` object,
/// extracting the name, edition, modules, and dependencies.
///
/// # Arguments
/// * `file_path` - Path to the weslBundle.js file
///
/// # Returns
/// Parsed WeslBundle or error
pub fn parse_wesl_bundle(file_path: &Path) -> Result<WeslBundle, WeslResolveError> {
    let source_text = fs::read_to_string(file_path).map_err(|e| {
        WeslResolveError::ParseError(format!("Failed to read {}: {}", file_path.display(), e))
    })?;

    let source_type = SourceType::from_path(file_path).unwrap_or(SourceType::mjs());

    let allocator = Allocator::default();
    let ret = Parser::new(&allocator, &source_text, source_type).parse();

    if !ret.errors.is_empty() {
        return Err(WeslResolveError::ParseError(format!(
            "Parse errors in {}: {:?}",
            file_path.display(),
            ret.errors
        )));
    }

    let mut extractor = BundleExtractor { bundle: None };
    extractor.visit_program(&ret.program);

    extractor.bundle.ok_or_else(|| {
        WeslResolveError::ParseError(format!("weslBundle not found in {}", file_path.display()))
    })
}

/// AST visitor that extracts the weslBundle object from a JavaScript file.
struct BundleExtractor {
    bundle: Option<WeslBundle>,
}

impl<'a> Visit<'a> for BundleExtractor {
    fn visit_variable_declaration(&mut self, decl: &VariableDeclaration<'a>) {
        // Look for: export const weslBundle = { ... }
        for declarator in &decl.declarations {
            if let BindingPatternKind::BindingIdentifier(binding_id) = &declarator.id.kind {
                if binding_id.name == "weslBundle" {
                    if let Some(init) = &declarator.init {
                        self.extract_bundle_object(init);
                    }
                }
            }
        }
    }
}

impl BundleExtractor {
    fn extract_bundle_object(&mut self, expr: &Expression) {
        if let Expression::ObjectExpression(obj) = expr {
            let mut name = None;
            let mut edition = None;
            let mut modules = Vec::new();

            for prop in &obj.properties {
                if let ObjectPropertyKind::ObjectProperty(p) = prop {
                    let key = self.get_property_key(&p.key);

                    match key.as_str() {
                        "name" => {
                            name = self.extract_string(&p.value);
                        }
                        "edition" => {
                            edition = self.extract_string(&p.value);
                        }
                        "modules" => {
                            modules = self.extract_modules_object(&p.value);
                        }
                        _ => {}
                    }
                }
            }

            if let (Some(name), Some(edition)) = (name, edition) {
                self.bundle = Some(WeslBundle {
                    name,
                    edition,
                    modules,
                    dependencies: Vec::new(), // TODO: Extract dependencies
                });
            }
        }
    }

    fn get_property_key(&self, key: &PropertyKey) -> String {
        match key {
            PropertyKey::StaticIdentifier(id) => id.name.to_string(),
            PropertyKey::StringLiteral(lit) => lit.value.to_string(),
            _ => String::new(),
        }
    }

    fn extract_string(&self, expr: &Expression) -> Option<String> {
        if let Expression::StringLiteral(lit) = expr {
            Some(lit.value.to_string())
        } else {
            None
        }
    }

    fn extract_modules_object(&self, expr: &Expression) -> Vec<(String, String)> {
        let mut modules = Vec::new();

        if let Expression::ObjectExpression(obj) = expr {
            for prop in &obj.properties {
                if let ObjectPropertyKind::ObjectProperty(p) = prop {
                    let key = self.get_property_key(&p.key);
                    if let Some(value) = self.extract_string(&p.value) {
                        modules.push((key, value));
                    }
                }
            }
        }

        modules
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::fs;

    fn parse_test_bundle(js: &str) -> WeslBundle {
        let path = env::temp_dir().join("test_bundle.js");
        fs::write(&path, js).unwrap();
        let result = parse_wesl_bundle(&path).unwrap();
        fs::remove_file(&path).ok();
        result
    }

    #[test]
    fn test_parse_bundle() {
        let result = parse_test_bundle(
            r#"
            export const weslBundle = {
              name: "test_pkg",
              edition: "unstable_2025_1",
              modules: { "lib.wgsl": "fn main() { }" }
            };
        "#,
        );

        assert_eq!(result.name, "test_pkg");
        assert_eq!(result.edition, "unstable_2025_1");
        assert_eq!(result.modules.len(), 1);
    }
}

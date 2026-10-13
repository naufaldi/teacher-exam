function readPackage(pkg) {
  if (pkg.name === "@effect/ai-openai") {
    pkg.dependencies = {
      ...pkg.dependencies,
      effect: "4.0.2"
    }
    if (pkg.peerDependencies !== undefined) {
      delete pkg.peerDependencies.effect
    }
  }
  return pkg
}

module.exports = {
  hooks: {
    readPackage
  }
}

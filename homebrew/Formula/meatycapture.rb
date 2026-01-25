class Meatycapture < Formula
  desc "Lightweight capture app for logging enhancements/bugs/ideas"
  homepage "https://github.com/miethe/meatycapture"
  license "MIT"
  version "0.1.0"

  # Platform-specific binary downloads
  # Binaries are raw executables (not archives) published to GitHub Releases

  on_macos do
    on_arm do
      url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-darwin-arm64"
      sha256 "UPDATE_ON_RELEASE_ARM64"
    end
    on_intel do
      url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-darwin-x64"
      sha256 "UPDATE_ON_RELEASE_X64"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-linux-arm64"
      sha256 "UPDATE_ON_RELEASE_LINUX_ARM64"
    end
    on_intel do
      url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-linux-x64"
      sha256 "UPDATE_ON_RELEASE_LINUX_X64"
    end
  end

  def install
    # Binary is downloaded with platform-specific name, rename to just "meatycapture"
    bin.install Dir.glob("meatycapture*").first => "meatycapture"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/meatycapture --version")
  end
end

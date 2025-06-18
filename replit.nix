{ pkgs }: {
  deps = [
    pkgs.nodejs
    pkgs.python3
    pkgs.python3Packages.python-docx
  ];
}
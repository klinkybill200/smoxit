#!/usr/bin/env python3
"""
Patches ios/App/App.xcodeproj/project.pbxproj to set Manual signing
only for the App target (identified by app.smoxit.ios bundle ID).
SPM packages like RevenueCat are not touched.

Usage: python3 patch_pbxproj.py <TEAM_ID>
"""

import re
import sys
from pathlib import Path

team_id = sys.argv[1] if len(sys.argv) > 1 else "UNKNOWN"
pbxproj = Path("ios/App/App.xcodeproj/project.pbxproj")

if not pbxproj.exists():
    print(f"ERROR: {pbxproj} not found")
    sys.exit(1)

text = pbxproj.read_text()

def patch_app_target_blocks(text):
    result = []
    i = 0
    patched_count = 0

    while i < len(text):
        m = re.search(r'buildSettings = \{', text[i:])
        if not m:
            result.append(text[i:])
            break

        start = i + m.start()
        block_start = i + m.end()
        result.append(text[i : start + len("buildSettings = {")])

        # Find matching closing brace
        depth = 1
        j = block_start
        while j < len(text) and depth > 0:
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
            j += 1

        block_content = text[block_start : j - 1]
        block_end = text[j - 1 : j]

        if "app.smoxit.ios" in block_content:
            # Remove existing signing settings
            block_content = re.sub(r"\n\s*CODE_SIGN_IDENTITY[^;]*;", "", block_content)
            block_content = re.sub(r"\n\s*CODE_SIGN_STYLE[^;]*;", "", block_content)
            block_content = re.sub(r"\n\s*DEVELOPMENT_TEAM[^;]*;", "", block_content)
            block_content = re.sub(r"\n\s*PROVISIONING_PROFILE_SPECIFIER[^;]*;", "", block_content)
            block_content = re.sub(r"\n\s*CODE_SIGN_ENTITLEMENTS[^;]*;", "", block_content)

            # Inject new signing settings at the top of the block
            signing = (
                "\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;"
                "\n\t\t\t\tCODE_SIGN_IDENTITY = \"Apple Distribution\";"
                "\n\t\t\t\tCODE_SIGN_STYLE = Manual;"
                f"\n\t\t\t\tDEVELOPMENT_TEAM = {team_id};"
                "\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = \"smoxit AppStore\";"
            )
            block_content = signing + block_content
            patched_count += 1
            print(f"Patched block #{patched_count} (contains app.smoxit.ios)")

        result.append(block_content)
        result.append(block_end)
        i = j

    return "".join(result)

patched = patch_app_target_blocks(text)
pbxproj.write_text(patched)
print(f"Done — patched project.pbxproj")

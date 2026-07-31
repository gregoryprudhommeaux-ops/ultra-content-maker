import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDefaultSignaturePs,
  looksLikeIdentitySignaturePs,
  stripGeneratedSignaturePs,
} from "./signature-ps";

describe("signature-ps", () => {
  it("detects bio / identity closers", () => {
    assert.equal(
      looksLikeIdentitySignaturePs(
        "PS : Grégory Prudhommeaux, fondateur basé entre France et Mexique. LA MESA, dîners privés thématiques à Guadalajara.",
      ),
      true,
    );
    assert.equal(
      looksLikeIdentitySignaturePs("Une note de bas de page sur le chiffre 12%."),
      false,
    );
  });

  it("strips identity PS and keeps non-identity footnotes", () => {
    assert.equal(
      stripGeneratedSignaturePs(
        "PS : Grégory Prudhommeaux, fondateur basé entre France et Mexique.",
      ),
      undefined,
    );
    assert.equal(
      stripGeneratedSignaturePs("Note: chiffre issu du rapport interne 2025."),
      "Note: chiffre issu du rapport interne 2025.",
    );
  });

  it("builds default signature from author fields", () => {
    assert.equal(
      buildDefaultSignaturePs({
        contentLanguage: "fr",
        displayName: "Grégory",
        roleTitle: "fondateur",
        positioningLine: "LA MESA à Guadalajara",
      }),
      "PS : Grégory, fondateur. LA MESA à Guadalajara",
    );
    assert.equal(
      buildDefaultSignaturePs({
        contentLanguage: "fr",
        savedSignaturePs: "PS : template sauvé",
        displayName: "Ignored",
      }),
      "PS : template sauvé",
    );
  });
});

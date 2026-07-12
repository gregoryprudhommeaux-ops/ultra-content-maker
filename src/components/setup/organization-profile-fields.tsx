"use client";

import { OptionalLabel } from "@/components/setup/optional-label";
import {
  emptyOrganizationProfile,
  listToTextareaLines,
  MAX_TEAM_MEMBERS,
  textareaLinesToList,
} from "@/lib/persona/organization-enrichment";
import { FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import type { OrganizationProfile, OrganizationTeamMember } from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";

type Props = {
  profile: OrganizationProfile;
  onChange: (profile: OrganizationProfile) => void;
};

export function OrganizationProfileFields({ profile, onChange }: Props) {
  const t = useTranslations("setup.author.organizationProfile");

  const safe = { ...emptyOrganizationProfile(), ...profile };
  const teamMembers =
    safe.teamMembers && safe.teamMembers.length > 0
      ? safe.teamMembers
      : [{ name: "", role: "" }];

  function patch(partial: Partial<OrganizationProfile>) {
    onChange({ ...safe, ...partial });
  }

  function updateTeam(index: number, partial: Partial<OrganizationTeamMember>) {
    const next = [...teamMembers];
    next[index] = { ...next[index], ...partial };
    patch({ teamMembers: next.filter((m) => m.name.trim() || m.role.trim()) });
  }

  function addTeamMember() {
    if (teamMembers.length >= MAX_TEAM_MEMBERS) return;
    patch({ teamMembers: [...teamMembers, { name: "", role: "" }] });
  }

  function removeTeamMember(index: number) {
    patch({
      teamMembers: teamMembers.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-cyan-200/80 bg-cyan-50/30 p-4">
      <div>
        <h3 className={FORM_SUBSECTION_TITLE}>{t("title")}</h3>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      <div>
        <OptionalLabel htmlFor="org-central-message">{t("centralMessage")}</OptionalLabel>
        <ImeSafeTextarea
          id="org-central-message"
          rows={2}
          value={safe.centralMessage ?? ""}
          onValueChange={(centralMessage) => patch({ centralMessage })}
          placeholder={t("centralMessagePlaceholder")}
          className={`${INPUT_CLASS} min-h-[4rem] resize-y`}
        />
      </div>

      <div>
        <OptionalLabel htmlFor="org-not" optional>
          {t("whatWeAreNot")}
        </OptionalLabel>
        <ImeSafeTextarea
          id="org-not"
          rows={2}
          value={safe.whatWeAreNot ?? ""}
          onValueChange={(whatWeAreNot) => patch({ whatWeAreNot })}
          placeholder={t("whatWeAreNotPlaceholder")}
          className={`${INPUT_CLASS} min-h-[3rem] resize-y`}
        />
      </div>

      <div>
        <OptionalLabel htmlFor="org-segments" optional>
          {t("clientSegments")}
        </OptionalLabel>
        <p className="mb-2 text-xs text-ns-secondary">{t("clientSegmentsHint")}</p>
        <ImeSafeTextarea
          id="org-segments"
          rows={3}
          value={listToTextareaLines(safe.clientSegments)}
          onValueChange={(text) => patch({ clientSegments: textareaLinesToList(text) })}
          placeholder={t("clientSegmentsPlaceholder")}
          className={`${INPUT_CLASS} min-h-[4rem] resize-y font-mono text-sm`}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-ns-tertiary">{t("teamTitle")}</p>
        <p className="text-xs text-ns-secondary">{t("teamHint")}</p>
        {teamMembers.map((member, index) => (
          <div key={index} className="flex flex-wrap gap-2 rounded-lg border border-cyan-100 bg-white/90 p-2">
            <ImeSafeInput
              value={member.name}
              onValueChange={(name) => updateTeam(index, { name })}
              placeholder={t("teamNamePlaceholder")}
              className={`${INPUT_CLASS} min-w-[8rem] flex-1`}
            />
            <ImeSafeInput
              value={member.role}
              onValueChange={(role) => updateTeam(index, { role })}
              placeholder={t("teamRolePlaceholder")}
              className={`${INPUT_CLASS} min-w-[10rem] flex-1`}
            />
            {index > 0 ? (
              <button
                type="button"
                onClick={() => removeTeamMember(index)}
                className="text-xs font-medium text-red-700 underline"
              >
                {t("removeTeamMember")}
              </button>
            ) : null}
          </div>
        ))}
        {teamMembers.length < MAX_TEAM_MEMBERS ? (
          <button
            type="button"
            onClick={addTeamMember}
            className="text-sm font-medium text-ns-primary underline"
          >
            {t("addTeamMember")}
          </button>
        ) : null}
      </div>

      <div>
        <OptionalLabel htmlFor="org-scope" optional>
          {t("serviceScope")}
        </OptionalLabel>
        <ImeSafeTextarea
          id="org-scope"
          rows={2}
          value={safe.serviceScope ?? ""}
          onValueChange={(serviceScope) => patch({ serviceScope })}
          placeholder={t("serviceScopePlaceholder")}
          className={`${INPUT_CLASS} min-h-[3rem] resize-y`}
        />
      </div>

      <div>
        <OptionalLabel htmlFor="org-exclusions" optional>
          {t("serviceExclusions")}
        </OptionalLabel>
        <ImeSafeTextarea
          id="org-exclusions"
          rows={2}
          value={safe.serviceExclusions ?? ""}
          onValueChange={(serviceExclusions) => patch({ serviceExclusions })}
          placeholder={t("serviceExclusionsPlaceholder")}
          className={`${INPUT_CLASS} min-h-[3rem] resize-y`}
        />
      </div>

      <div>
        <OptionalLabel htmlFor="org-forbidden" optional>
          {t("forbiddenPhrases")}
        </OptionalLabel>
        <p className="mb-2 text-xs text-ns-secondary">{t("forbiddenPhrasesHint")}</p>
        <ImeSafeTextarea
          id="org-forbidden"
          rows={3}
          value={listToTextareaLines(safe.forbiddenPhrases)}
          onValueChange={(text) => patch({ forbiddenPhrases: textareaLinesToList(text) })}
          placeholder={t("forbiddenPhrasesPlaceholder")}
          className={`${INPUT_CLASS} min-h-[4rem] resize-y font-mono text-sm`}
        />
      </div>

      <div>
        <OptionalLabel htmlFor="org-preferred" optional>
          {t("preferredPhrases")}
        </OptionalLabel>
        <ImeSafeTextarea
          id="org-preferred"
          rows={2}
          value={listToTextareaLines(safe.preferredPhrases)}
          onValueChange={(text) => patch({ preferredPhrases: textareaLinesToList(text) })}
          placeholder={t("preferredPhrasesPlaceholder")}
          className={`${INPUT_CLASS} min-h-[3rem] resize-y font-mono text-sm`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <OptionalLabel htmlFor="org-stats">{t("statsPolicy")}</OptionalLabel>
          <select
            id="org-stats"
            value={safe.statsPolicy ?? "none"}
            onChange={(e) =>
              patch({
                statsPolicy: e.target.value as OrganizationProfile["statsPolicy"],
              })
            }
            className={INPUT_CLASS}
          >
            <option value="none">{t("statsPolicyNone")}</option>
            <option value="validated_only">{t("statsPolicyValidated")}</option>
            <option value="sources_required">{t("statsPolicySources")}</option>
          </select>
        </div>
        <div>
          <OptionalLabel htmlFor="org-presence">{t("linkedInPresence")}</OptionalLabel>
          <select
            id="org-presence"
            value={safe.linkedInPresence ?? "company_page"}
            onChange={(e) =>
              patch({
                linkedInPresence: e.target.value as OrganizationProfile["linkedInPresence"],
              })
            }
            className={INPUT_CLASS}
          >
            <option value="company_page">{t("presenceCompany")}</option>
            <option value="leader">{t("presenceLeader")}</option>
            <option value="hybrid">{t("presenceHybrid")}</option>
            <option value="agency_managed">{t("presenceAgency")}</option>
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-ns-secondary">
        <input
          type="checkbox"
          checked={safe.visualFirst !== false}
          onChange={(e) => patch({ visualFirst: e.target.checked })}
          className="mt-1"
        />
        <span>
          <span className="font-medium text-ns-tertiary">{t("visualFirst")}</span>
          <span className="mt-0.5 block text-xs">{t("visualFirstHint")}</span>
        </span>
      </label>
    </div>
  );
}

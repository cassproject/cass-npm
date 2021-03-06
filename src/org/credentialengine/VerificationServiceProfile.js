/**
 * credentialengine.org/VerificationServiceProfile
 * Entity describing the means by which someone can verify whether a credential has been attained.
 * Includes, but is not limited to, verification of whether quality assurance credentials have been issued for organizations, learning opportunities, and assessments.
 * @author credentialengine.org
 * @class VerificationServiceProfile
 * @module org.credentialengine
 * @extends Intangible
 */
module.exports = class VerificationServiceProfile extends schema.Intangible {
	/**
	 * Constructor, automatically sets @context and @type.
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType(
			"http://schema.eduworks.com/simpleCtdl",
			"VerificationServiceProfile"
		);
	}

	/**
	 * http://purl.org/ctdl/terms/dateEffective
	 * Effective date of the content of a credential, assessment or learning opportunity.
	 * @property dateEffective
	 * @type date
	 */
	dateEffective;

	/**
	 * http://purl.org/ctdl/terms/description
	 * Statement, characterization or account of the entity.
	 * @property description
	 * @type langString
	 */
	description;

	/**
	 * http://purl.org/ctdl/terms/estimatedCost
	 * Estimated cost of a credential, learning opportunity or assessment.
	 * @property estimatedCost
	 * @type CostProfile
	 */
	estimatedCost;

	/**
	 * http://purl.org/ctdl/terms/holderMustAuthorize
	 * Whether or not the credential holder must authorize the organization to provide the verification service.
	 * @property holderMustAuthorize
	 * @type boolean
	 */
	holderMustAuthorize;

	/**
	 * http://purl.org/ctdl/terms/jurisdiction
	 * Geographic or political region in which the credential is formally applicable or an organization has authority to act.
	 * @property jurisdiction
	 * @type JurisdictionProfile
	 */
	jurisdiction;

	/**
	 * http://purl.org/ctdl/terms/offeredBy
	 * Agent that offers the resource.
	 * @property offeredBy
	 * @type CredentialOrganization | CredentialPerson | QACredentialOrganization
	 */
	offeredBy;

	/**
	 * http://purl.org/ctdl/terms/offeredIn
	 * Region or political jurisdiction such as a state, province or locale where the credential, learning resource or assessment is offered.
	 * @property offeredIn
	 * @type JurisdictionProfile
	 */
	offeredIn;

	/**
	 * http://purl.org/ctdl/terms/region
	 * Entity that describes the longitude, latitude and other location details of an area.
	 * @property region
	 * @type Place
	 */
	region;

	/**
	 * http://purl.org/ctdl/terms/subjectWebpage
	 * Webpage that describes this entity.
	 * The web page being referenced describes the entity. The value of subjectWebpage is an authoritative location for information about the subject but should not assumed to be a persistent identifier of the subject.
	 * @property subjectWebpage
	 * @type anyURI
	 */
	subjectWebpage;

	/**
	 * http://purl.org/ctdl/terms/targetCredential
	 * Credential that is a focus or target of the condition, process or verification service.
	 * @property targetCredential
	 * @type ApprenticeshipCertificate | AssociateDegree | BachelorDegree | Badge | Certificate | CertificateOfCompletion | Certification | Credential | Degree | DigitalBadge | Diploma | DoctoralDegree | GeneralEducationDevelopment | JourneymanCertificate | License | MasterCertificate | MasterDegree | MicroCredential | OpenBadge | ProfessionalDoctorate | QualityAssuranceCredential | ResearchDoctorate | SecondarySchoolDiploma
	 */
	targetCredential;

	/**
	 * http://purl.org/ctdl/terms/verificationDirectory
	 * Directory of credential holders and their current statuses.
	 * @property verificationDirectory
	 * @type anyURI
	 */
	verificationDirectory;

	/**
	 * http://purl.org/ctdl/terms/verificationMethodDescription
	 * Textual description of the methods used to evaluate an assessment, learning opportunity, process or verificaiton service for validity or reliability.
	 * @property verificationMethodDescription
	 * @type langString
	 */
	verificationMethodDescription;

	/**
	 * http://purl.org/ctdl/terms/verificationService
	 * Direct access to the verification service.
	 * This property identifies machine-accessible services, such as API endpoints, that provide direct access to the verification service being described.
	 * @property verificationService
	 * @type anyURI
	 */
	verificationService;

	/**
	 * http://purl.org/ctdl/terms/verifiedClaimType
	 * Type of claim provided through a verification service; select from an existing enumeration of such types.
	 * @property verifiedClaimType
	 * @type CredentialAlignmentObject
	 */
	verifiedClaimType;
};

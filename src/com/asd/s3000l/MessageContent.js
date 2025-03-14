
const CrudCodeValues = require("./CrudCodeValues");
module.exports = class MessageContent extends EcRemoteLinkedData {
    messageContentItems;
    supportingContentItems;
    uid;
    crud;

    getMessageContentItems() {
        return this.messageContentItems;
    }

    setMessageContentItems(value) {
        this.messageContentItems = value;
    }

    getSupportingContentItems() {
        return this.supportingContentItems;
    }

    setSupportingContentItems(value) {
        this.supportingContentItems = value;
    }

    getUid() {
        return this.uid;
    }

    setUid(value) {
        this.uid = value;
    }

    getCrud() {
        if (this.crud == null) {
            return CrudCodeValues.I;
        } else {
            return this.crud;
        }
    }

    setCrud(value) {
        this.crud = value;
    }

    MessageContentItems = class MessageContentItems {
        tasks;
        learningObjectives;
        warningCautionNotes;
        trades;
        skills;
        jobPosns;

        getTasks() {
            return this.tasks;
        }

        setTasks(value) {
            this.tasks = value;
        }

        getLearningObjectives() {
            return this.learningObjectives;
        }

        setLearningObjectives(value) {
            this.learningObjectives = value;
        }

        getWarningCautionNotes() {
            return this.warningCautionNotes;
        }

        setWarningCautionNotes(value) {
            this.warningCautionNotes = value;
        }

        getTrades() {
            return this.trades;
        }

        setTrades(value) {
            this.trades = value;
        }

        getSkills() {
            return this.skills;
        }

        setSkills(value) {
            this.skills = value;
        }

        getJobPosns() {
            return this.jobPosns;
        }

        setJobPosns(value) {
            this.jobPosns = value;
        }

        JobPosns = class JobPosns {
            jobPos;

            getJobPos() {
                if (this.jobPos == null) {
                    this.jobPos = [];
                }
                return this.jobPos;
            }
        }

        LearningObjectives = class LearningObjectives {
            learnObj;

            getLearnObj() {
                if (this.learnObj == null) {
                    this.learnObj = [];
                }
                return this.learnObj;
            }
        }

        Skills = class Skills {
            skill;

            getSkill() {
                if (this.skill == null) {
                    this.skill = [];
                }
                return this.skill;
            }
        }

        Tasks = class Tasks {
            taskNonAbstractClasses;

            getTaskNonAbstractClasses() {
                if (this.taskNonAbstractClasses == null) {
                    this.taskNonAbstractClasses = [];
                }
                return this.taskNonAbstractClasses;
            }
        }

        Trades = class Trades {
            trade;

            getTrade() {
                if (this.trade == null) {
                    this.trade = [];
                }
                return this.trade;
            }
        }

        WarningCautionNotes = class WarningCautionNotes {
            wcn;

            getWcn() {
                if (this.wcn == null) {
                    this.wcn = [];
                }
                return this.wcn;
            }
        }
    }

    SupportingContentItems = class SupportingContentItems {
        products;
        breakdownElements;
        parts;
        taskRequirements;
        maintenanceLevels;
        maintenanceLocations;
        operatingLocationTypes;
        operatingLocations;
        substances;
        specialEvents;
        productUsagePhases;
        resourceSpecifications;
        changeRequests;
        circuitBreakers;
        securityClasses;
        documents;
        organizations;
        applicabilityStatements;
        applicabilityConditions;

        getProducts() {
            return this.products;
        }

        setProducts(value) {
            this.products = value;
        }

        getBreakdownElements() {
            return this.breakdownElements;
        }

        setBreakdownElements(value) {
            this.breakdownElements = value;
        }

        getParts() {
            return this.parts;
        }

        setParts(value) {
            this.parts = value;
        }

        getTaskRequirements() {
            return this.taskRequirements;
        }

        setTaskRequirements(value) {
            this.taskRequirements = value;
        }

        getMaintenanceLevels() {
            return this.maintenanceLevels;
        }

        setMaintenanceLevels(value) {
            this.maintenanceLevels = value;
        }

        getMaintenanceLocations() {
            return this.maintenanceLocations;
        }

        setMaintenanceLocations(value) {
            this.maintenanceLocations = value;
        }

        getOperatingLocationTypes() {
            return this.operatingLocationTypes;
        }

        setOperatingLocationTypes(value) {
            this.operatingLocationTypes = value;
        }

        getOperatingLocations() {
            return this.operatingLocations;
        }

        setOperatingLocations(value) {
            this.operatingLocations = value;
        }

        getSubstances() {
            return this.substances;
        }

        setSubstances(value) {
            this.substances = value;
        }

        getSpecialEvents() {
            return this.specialEvents;
        }

        setSpecialEvents(value) {
            this.specialEvents = value;
        }

        getProductUsagePhases() {
            return this.productUsagePhases;
        }

        setProductUsagePhases(value) {
            this.productUsagePhases = value;
        }

        getResourceSpecifications() {
            return this.resourceSpecifications;
        }

        setResourceSpecifications(value) {
            this.resourceSpecifications = value;
        }

        getChangeRequests() {
            return this.changeRequests;
        }

        setChangeRequests(value) {
            this.changeRequests = value;
        }

        getCircuitBreakers() {
            return this.circuitBreakers;
        }

        setCircuitBreakers(value) {
            this.circuitBreakers = value;
        }

        getSecurityClasses() {
            return this.securityClasses;
        }

        setSecurityClasses(value) {
            this.securityClasses = value;
        }

        getDocuments() {
            return this.documents;
        }

        setDocuments(value) {
            this.documents = value;
        }

        getOrganizations() {
            return this.organizations;
        }

        setOrganizations(value) {
            this.organizations = value;
        }

        getApplicabilityStatements() {
            return this.applicabilityStatements;
        }

        setApplicabilityStatements(value) {
            this.applicabilityStatements = value;
        }

        getApplicabilityConditions() {
            return this.applicabilityConditions;
        }

        setApplicabilityConditions(value) {
            this.applicabilityConditions = value;
        }

        ApplicabilityConditions = class ApplicabilityConditions {
            cond;

            getCond() {
                if (this.cond == null) {
                    this.cond = [];
                }
                return this.cond;
            }
        }

        ApplicabilityStatements = class ApplicabilityStatements {
            applicabilityStatementNonAbstractClasses;

            getApplicabilityStatementNonAbstractClasses() {
                if (this.applicabilityStatementNonAbstractClasses == null) {
                    this.applicabilityStatementNonAbstractClasses = [];
                }
                return this.applicabilityStatementNonAbstractClasses;
            }
        }

        BreakdownElements = class BreakdownElements {
            breakdownElementNonAbstractClasses;

            getBreakdownElementNonAbstractClasses() {
                if (this.breakdownElementNonAbstractClasses == null) {
                    this.breakdownElementNonAbstractClasses = [];
                }
                return this.breakdownElementNonAbstractClasses;
            }
        }

        ChangeRequests = class ChangeRequests {
            cr;

            getCr() {
                if (this.cr == null) {
                    this.cr = [];
                }
                return this.cr;
            }
        }

        CircuitBreakers = class CircuitBreakers {
            cb;

            getCb() {
                if (this.cb == null) {
                    this.cb = [];
                }
                return this.cb;
            }
        }

        Documents = class Documents {
            documentNonAbstractClasses;

            getDocumentNonAbstractClasses() {
                if (this.documentNonAbstractClasses == null) {
                    this.documentNonAbstractClasses = [];
                }
                return this.documentNonAbstractClasses;
            }
        }

        MaintenanceLevels = class MaintenanceLevels {
            mlv;

            getMlv() {
                if (this.mlv == null) {
                    this.mlv = [];
                }
                return this.mlv;
            }
        }

        MaintenanceLocations = class MaintenanceLocations {
            mLoc;

            getMLoc() {
                if (this.mLoc == null) {
                    this.mLoc = [];
                }
                return this.mLoc;
            }
        }

        OperatingLocationTypes = class OperatingLocationTypes {
            opLocType;

            getOpLocType() {
                if (this.opLocType == null) {
                    this.opLocType = [];
                }
                return this.opLocType;
            }
        }

        OperatingLocations = class OperatingLocations {
            opLoc;

            getOpLoc() {
                if (this.opLoc == null) {
                    this.opLoc = [];
                }
                return this.opLoc;
            }
        }

        Organizations = class Organizations {
            org;

            getOrg() {
                if (this.org == null) {
                    this.org = [];
                }
                return this.org;
            }
        }

        Parts = class Parts {
            partAsDesignedNonAbstractClasses;

            getPartAsDesignedNonAbstractClasses() {
                if (this.partAsDesignedNonAbstractClasses == null) {
                    this.partAsDesignedNonAbstractClasses = [];
                }
                return this.partAsDesignedNonAbstractClasses;
            }
        }

        ProductUsagePhases = class ProductUsagePhases {
            usagePhaseDef;

            getUsagePhaseDef() {
                if (this.usagePhaseDef == null) {
                    this.usagePhaseDef = [];
                }
                return this.usagePhaseDef;
            }
        }

        Products = class Products {
            prod;

            getProd() {
                if (this.prod == null) {
                    this.prod = [];
                }
                return this.prod;
            }
        }

        ResourceSpecifications = class ResourceSpecifications {
            resourceSpecificationNonAbstractClasses;

            getResourceSpecificationNonAbstractClasses() {
                if (this.resourceSpecificationNonAbstractClasses == null) {
                    this.resourceSpecificationNonAbstractClasses = [];
                }
                return this.resourceSpecificationNonAbstractClasses;
            }
        }

        SecurityClasses = class SecurityClasses {
            secClassDef;

            getSecClassDef() {
                if (this.secClassDef == null) {
                    this.secClassDef = [];
                }
                return this.secClassDef;
            }
        }

        SpecialEvents = class SpecialEvents {
            sEvnt;

            getSEvnt() {
                if (this.sEvnt == null) {
                    this.sEvnt = [];
                }
                return this.sEvnt;
            }
        }

        Substances = class Substances {
            subs;

            getSubs() {
                if (this.subs == null) {
                    this.subs = [];
                }
                return this.subs;
            }
        }

        TaskRequirements = class TaskRequirements {
            taskRequirementNonAbstractClasses;

            getTaskRequirementNonAbstractClasses() {
                if (this.taskRequirementNonAbstractClasses == null) {
                    this.taskRequirementNonAbstractClasses = [];
                }
                return this.taskRequirementNonAbstractClasses;
            }
        }
    }

    constructor() {
        super("http://www.asd-europe.org/s-series/s3000l", "MessageContent");
    }
};

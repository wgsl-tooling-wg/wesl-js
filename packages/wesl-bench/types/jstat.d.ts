declare module "jstat" {
  interface JStatStatic {
    studentt: {
      inv(p: number, dof: number): number;
    };
  }
  const jstat: JStatStatic;
  export default jstat;
}
